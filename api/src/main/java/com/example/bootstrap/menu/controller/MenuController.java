package com.example.bootstrap.menu.controller;

import com.example.bootstrap.menu.application.dto.AdminMenuResponse;
import com.example.bootstrap.menu.application.dto.MyMenuResponse;
import com.example.bootstrap.menu.application.service.MenuPermissionService;
import com.example.bootstrap.menu.domain.repository.MenuRepository;
import com.example.bootstrap.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Comparator;
import java.util.List;

/**
 * 메뉴 API 컨트롤러.
 *
 * <p>인증된 사용자의 접근 가능한 메뉴 목록 조회 엔드포인트를 제공합니다.
 */
@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private final MenuPermissionService menuPermissionService;
    private final MenuRepository menuRepository;

    /**
     * @param menuPermissionService 메뉴 권한 서비스
     * @param menuRepository        메뉴 리포지토리
     */
    public MenuController(final MenuPermissionService menuPermissionService,
                          final MenuRepository menuRepository) {
        this.menuPermissionService = menuPermissionService;
        this.menuRepository = menuRepository;
    }

    /**
     * ADMIN 전용 전체 메뉴 목록을 반환합니다.
     *
     * <p>표시 순서(displayOrder) 오름차순으로 정렬하여 모든 메뉴를 반환합니다.
     *
     * @return 200 OK + 전체 메뉴 목록
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<List<AdminMenuResponse>>>> getMenus() {
        return menuRepository.findAll()
                .collectSortedList(Comparator.comparingInt(
                        m -> m.getDisplayOrder() != null ? m.getDisplayOrder() : 0))
                .map(menus -> menus.stream()
                        .map(m -> new AdminMenuResponse(
                                m.getId(), m.getCode(), m.getName(),
                                m.getDisplayOrder(), m.isActive()))
                        .toList())
                .map(list -> ResponseEntity.ok(
                        ApiResponse.success("전체 메뉴 목록을 조회했습니다.", list)));
    }

    /**
     * 인증된 사용자의 접근 가능한 메뉴 목록을 반환합니다.
     *
     * <p>ADMIN 권한이면 전체 활성 메뉴를 canRead=true, canWrite=true로 반환합니다.
     * 역할이 없는 일반 사용자는 빈 배열을 반환합니다.
     *
     * @param authentication JWT 인증 정보 (principal = userId Long)
     * @return 200 OK + 접근 가능한 메뉴 목록
     */
    @GetMapping("/my")
    public Mono<ResponseEntity<ApiResponse<List<MyMenuResponse>>>> getMyMenus(
            final Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return menuPermissionService.getMyMenus(userId, isAdmin)
                .map(menus -> ResponseEntity.ok(
                        ApiResponse.success("접근 가능한 메뉴 목록을 조회했습니다.", menus)));
    }
}
