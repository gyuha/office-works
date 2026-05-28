package com.example.bootstrap.menu.application.service;

import com.example.bootstrap.menu.application.dto.AdminMenuResponse;
import com.example.bootstrap.menu.application.dto.MyMenuResponse;
import com.example.bootstrap.menu.domain.model.Menu;
import com.example.bootstrap.menu.domain.model.RoleMenuPermission;
import com.example.bootstrap.menu.domain.model.UserMenuPermission;
import com.example.bootstrap.menu.domain.repository.MenuRepository;
import com.example.bootstrap.menu.domain.repository.RoleMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 메뉴 권한 병합 서비스.
 *
 * <p>ADMIN bypass, 역할 OR 집계, 개인 오버라이드 병합을 담당합니다.
 */
@Service
public class MenuPermissionService {

    private final UserRoleRepository userRoleRepository;
    private final RoleMenuPermissionRepository roleMenuPermissionRepository;
    private final UserMenuPermissionRepository userMenuPermissionRepository;
    private final MenuRepository menuRepository;

    public MenuPermissionService(
            final UserRoleRepository userRoleRepository,
            final RoleMenuPermissionRepository roleMenuPermissionRepository,
            final UserMenuPermissionRepository userMenuPermissionRepository,
            final MenuRepository menuRepository) {
        this.userRoleRepository = userRoleRepository;
        this.roleMenuPermissionRepository = roleMenuPermissionRepository;
        this.userMenuPermissionRepository = userMenuPermissionRepository;
        this.menuRepository = menuRepository;
    }

    /**
     * ADMIN 전용 전체 메뉴 목록을 반환합니다 (display_order 오름차순).
     *
     * @return 모든 메뉴 목록 (비활성 포함)
     */
    public Mono<List<AdminMenuResponse>> getAllMenus() {
        return menuRepository.findAll()
                .collectSortedList(Comparator.comparingInt(
                        m -> m.getDisplayOrder() != null ? m.getDisplayOrder() : 0))
                .map(menus -> menus.stream()
                        .map(m -> new AdminMenuResponse(
                                m.getId(), m.getCode(), m.getName(),
                                m.getDisplayOrder(), m.isActive()))
                        .toList());
    }

    /**
     * 사용자의 접근 가능한 메뉴 목록을 반환합니다.
     *
     * @param userId  사용자 ID
     * @param isAdmin ADMIN 여부 (true이면 전체 메뉴 반환)
     * @return 접근 가능한 메뉴 목록
     */
    public Mono<List<MyMenuResponse>> getMyMenus(final Long userId, final boolean isAdmin) {
        if (isAdmin) {
            return menuRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
                    .map(menu -> new MyMenuResponse(menu.getId(), menu.getCode(), menu.getName(), true, true))
                    .collectList();
        }

        Mono<List<Long>> roleIdsMono = userRoleRepository.findByUserId(userId)
                .map(ur -> ur.getRoleId())
                .collectList();

        return roleIdsMono.flatMap(roleIds -> {
            Mono<List<RoleMenuPermission>> rolePermsMono = roleIds.isEmpty()
                    ? Mono.just(Collections.emptyList())
                    : roleMenuPermissionRepository.findByRoleIdIn(roleIds).collectList();

            Mono<List<UserMenuPermission>> userPermsMono =
                    userMenuPermissionRepository.findByUserId(userId).collectList();

            return Mono.zip(rolePermsMono, userPermsMono).flatMap(tuple -> {
                List<RoleMenuPermission> rolePerms = tuple.getT1();
                List<UserMenuPermission> userPerms = tuple.getT2();

                Map<Long, boolean[]> permMap = buildRolePermissionMap(rolePerms);
                applyUserOverrides(permMap, userPerms);

                List<Long> accessibleMenuIds = permMap.entrySet().stream()
                        .filter(e -> e.getValue()[0] || e.getValue()[1])
                        .map(Map.Entry::getKey)
                        .toList();

                if (accessibleMenuIds.isEmpty()) {
                    return Mono.just(Collections.emptyList());
                }

                return menuRepository.findAllById(accessibleMenuIds)
                        .filter(menu -> Boolean.TRUE.equals(menu.isActive()))
                        .sort(Comparator.comparingInt(Menu::getDisplayOrder))
                        .map(menu -> {
                            boolean[] perms = permMap.get(menu.getId());
                            return new MyMenuResponse(
                                    menu.getId(), menu.getCode(), menu.getName(),
                                    perms[0], perms[1]);
                        })
                        .collectList();
            });
        });
    }

    /**
     * 사용자가 특정 메뉴에 대한 읽기 권한이 있는지 확인합니다.
     *
     * @param userId   사용자 ID
     * @param menuCode 메뉴 코드
     * @return 읽기 권한 여부
     */
    public Mono<Boolean> canRead(final Long userId, final String menuCode) {
        return menuRepository.findByCode(menuCode)
                .flatMap(menu -> getMyMenus(userId, false)
                        .map(list -> list.stream()
                                .filter(r -> r.menuId().equals(menu.getId()))
                                .map(MyMenuResponse::canRead)
                                .findFirst()
                                .orElse(false)))
                .defaultIfEmpty(false);
    }

    /**
     * 사용자가 특정 메뉴에 대한 쓰기 권한이 있는지 확인합니다.
     *
     * @param userId   사용자 ID
     * @param menuCode 메뉴 코드
     * @return 쓰기 권한 여부
     */
    public Mono<Boolean> canWrite(final Long userId, final String menuCode) {
        return menuRepository.findByCode(menuCode)
                .flatMap(menu -> getMyMenus(userId, false)
                        .map(list -> list.stream()
                                .filter(r -> r.menuId().equals(menu.getId()))
                                .map(MyMenuResponse::canWrite)
                                .findFirst()
                                .orElse(false)))
                .defaultIfEmpty(false);
    }

    private Map<Long, boolean[]> buildRolePermissionMap(final List<RoleMenuPermission> rolePerms) {
        Map<Long, boolean[]> map = new HashMap<>();
        for (RoleMenuPermission p : rolePerms) {
            boolean cr = Boolean.TRUE.equals(p.getCanRead());
            boolean cw = Boolean.TRUE.equals(p.getCanWrite());
            map.merge(p.getMenuId(), new boolean[]{cr, cw},
                    (existing, incoming) -> new boolean[]{existing[0] || incoming[0], existing[1] || incoming[1]});
        }
        return map;
    }

    private void applyUserOverrides(final Map<Long, boolean[]> permMap,
                                    final List<UserMenuPermission> userPerms) {
        for (UserMenuPermission p : userPerms) {
            boolean cr = Boolean.TRUE.equals(p.getCanRead());
            boolean cw = Boolean.TRUE.equals(p.getCanWrite());
            permMap.put(p.getMenuId(), new boolean[]{cr, cw});
        }
    }
}
