package com.example.bootstrap.menu.controller;

import com.example.bootstrap.menu.application.dto.MyMenuResponse;
import com.example.bootstrap.menu.application.service.MenuPermissionService;
import com.example.bootstrap.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

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

    /**
     * @param menuPermissionService 메뉴 권한 서비스
     */
    public MenuController(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
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
