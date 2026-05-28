package com.example.bootstrap.menu.application.service;

import com.example.bootstrap.menu.domain.model.Menu;
import com.example.bootstrap.menu.domain.model.RoleMenuPermission;
import com.example.bootstrap.menu.domain.model.UserMenuPermission;
import com.example.bootstrap.menu.domain.model.UserRole;
import com.example.bootstrap.menu.domain.repository.MenuRepository;
import com.example.bootstrap.menu.domain.repository.RoleMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserMenuPermissionRepository;
import com.example.bootstrap.menu.domain.repository.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MenuPermissionServiceTest {

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RoleMenuPermissionRepository roleMenuPermissionRepository;

    @Mock
    private UserMenuPermissionRepository userMenuPermissionRepository;

    @Mock
    private MenuRepository menuRepository;

    private MenuPermissionService menuPermissionService;

    @BeforeEach
    void setUp() {
        menuPermissionService = new MenuPermissionService(
                userRoleRepository,
                roleMenuPermissionRepository,
                userMenuPermissionRepository,
                menuRepository
        );
    }

    @Test
    void getMyMenus_withAdminRole_returnsAllActiveMenus() {
        Menu menu1 = buildMenu(1L, "DASHBOARD", "대시보드", 1);
        Menu menu2 = buildMenu(2L, "USERS", "사용자 관리", 2);
        when(menuRepository.findByIsActiveTrueOrderByDisplayOrderAsc()).thenReturn(Flux.just(menu1, menu2));

        StepVerifier.create(menuPermissionService.getMyMenus(99L, true))
                .assertNext(list -> {
                    assertThat(list).hasSize(2);
                    assertThat(list.get(0).canRead()).isTrue();
                    assertThat(list.get(0).canWrite()).isTrue();
                    assertThat(list.get(1).canRead()).isTrue();
                    assertThat(list.get(1).canWrite()).isTrue();
                })
                .verifyComplete();

        verify(userRoleRepository, never()).findByUserId(any());
    }

    @Test
    void getMyMenus_withEmptyRoles_returnsEmptyList() {
        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.empty());
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.empty());

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> assertThat(list).isEmpty())
                .verifyComplete();

        verify(roleMenuPermissionRepository, never()).findByRoleIdIn(any());
    }

    @Test
    void getMyMenus_withRolePermissions_returnsAccessibleMenus() {
        UserRole userRole = buildUserRole(1L);
        RoleMenuPermission rolePerm = buildRolePerm(10L, true, false);
        Menu menu = buildMenu(10L, "REPORTS", "보고서", 1);

        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.just(userRole));
        when(roleMenuPermissionRepository.findByRoleIdIn(List.of(1L))).thenReturn(Flux.just(rolePerm));
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.empty());
        when(menuRepository.findAllById(List.of(10L))).thenReturn(Flux.just(menu));

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> {
                    assertThat(list).hasSize(1);
                    assertThat(list.get(0).menuId()).isEqualTo(10L);
                    assertThat(list.get(0).canRead()).isTrue();
                    assertThat(list.get(0).canWrite()).isFalse();
                })
                .verifyComplete();
    }

    @Test
    void getMyMenus_withUserOverride_overridePrevailsOverRolePermission() {
        UserRole userRole = buildUserRole(1L);
        RoleMenuPermission rolePerm = buildRolePerm(10L, true, false);
        UserMenuPermission userPerm = buildUserPerm(10L, false, true);
        Menu menu = buildMenu(10L, "REPORTS", "보고서", 1);

        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.just(userRole));
        when(roleMenuPermissionRepository.findByRoleIdIn(List.of(1L))).thenReturn(Flux.just(rolePerm));
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.just(userPerm));
        when(menuRepository.findAllById(List.of(10L))).thenReturn(Flux.just(menu));

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> {
                    assertThat(list).hasSize(1);
                    assertThat(list.get(0).canRead()).isFalse();
                    assertThat(list.get(0).canWrite()).isTrue();
                })
                .verifyComplete();
    }

    @Test
    void getMyMenus_withMultipleRoles_orAggregatesPermissions() {
        UserRole roleA = buildUserRole(1L);
        UserRole roleB = buildUserRole(2L);
        RoleMenuPermission permA = buildRolePerm(10L, true, false);
        RoleMenuPermission permB = buildRolePerm(10L, false, true);
        Menu menu = buildMenu(10L, "REPORTS", "보고서", 1);

        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.just(roleA, roleB));
        when(roleMenuPermissionRepository.findByRoleIdIn(List.of(1L, 2L))).thenReturn(Flux.just(permA, permB));
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.empty());
        when(menuRepository.findAllById(List.of(10L))).thenReturn(Flux.just(menu));

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> {
                    assertThat(list).hasSize(1);
                    assertThat(list.get(0).canRead()).isTrue();
                    assertThat(list.get(0).canWrite()).isTrue();
                })
                .verifyComplete();
    }

    @Test
    void getMyMenus_withNoPermission_excludesMenuFromResult() {
        UserRole userRole = buildUserRole(1L);
        RoleMenuPermission rolePerm = buildRolePerm(10L, false, false);

        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.just(userRole));
        when(roleMenuPermissionRepository.findByRoleIdIn(List.of(1L))).thenReturn(Flux.just(rolePerm));
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.empty());

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> assertThat(list).isEmpty())
                .verifyComplete();
    }

    @Test
    void getMyMenus_withNoRolesButUserOverride_returnsMenuFromUserPermission() {
        UserMenuPermission userPerm = buildUserPerm(10L, true, true);
        Menu menu = buildMenu(10L, "REPORTS", "보고서", 1);

        when(userRoleRepository.findByUserId(99L)).thenReturn(Flux.empty());
        when(userMenuPermissionRepository.findByUserId(99L)).thenReturn(Flux.just(userPerm));
        when(menuRepository.findAllById(List.of(10L))).thenReturn(Flux.just(menu));

        StepVerifier.create(menuPermissionService.getMyMenus(99L, false))
                .assertNext(list -> {
                    assertThat(list).hasSize(1);
                    assertThat(list.get(0).menuId()).isEqualTo(10L);
                    assertThat(list.get(0).canRead()).isTrue();
                    assertThat(list.get(0).canWrite()).isTrue();
                })
                .verifyComplete();

        verify(roleMenuPermissionRepository, never()).findByRoleIdIn(any());
    }

    @Test
    void canRead_whenMenuCodeNotFound_returnsFalse() {
        when(menuRepository.findByCode("UNKNOWN")).thenReturn(Mono.empty());

        StepVerifier.create(menuPermissionService.canRead(99L, "UNKNOWN"))
                .expectNext(false)
                .verifyComplete();
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private static Menu buildMenu(Long id, String code, String name, int displayOrder) {
        Menu menu = new Menu();
        menu.setId(id);
        menu.setCode(code);
        menu.setName(name);
        menu.setDisplayOrder(displayOrder);
        menu.setActive(Boolean.TRUE);
        return menu;
    }

    private static UserRole buildUserRole(Long roleId) {
        UserRole userRole = new UserRole();
        userRole.setRoleId(roleId);
        return userRole;
    }

    private static RoleMenuPermission buildRolePerm(Long menuId, boolean canRead, boolean canWrite) {
        RoleMenuPermission perm = new RoleMenuPermission();
        perm.setMenuId(menuId);
        perm.setCanRead(canRead);
        perm.setCanWrite(canWrite);
        return perm;
    }

    private static UserMenuPermission buildUserPerm(Long menuId, boolean canRead, boolean canWrite) {
        UserMenuPermission perm = new UserMenuPermission();
        perm.setMenuId(menuId);
        perm.setCanRead(canRead);
        perm.setCanWrite(canWrite);
        return perm;
    }
}
