package com.example.bootstrap.global.security;

import com.example.bootstrap.menu.application.service.MenuPermissionService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * 메뉴 접근 권한 확인 Bean.
 *
 * <p>SpEL 표현식에서 {@code @menuAuthorizationBean.canRead(authentication, menuCode)} 형태로 사용합니다.
 * Phase 2에서는 Bean만 등록하며 {@code @PreAuthorize}는 적용하지 않습니다.
 */
@Component("menuAuthorizationBean")
public class MenuAuthorizationBean {

    private final MenuPermissionService menuPermissionService;

    /**
     * @param menuPermissionService 메뉴 권한 서비스
     */
    public MenuAuthorizationBean(final MenuPermissionService menuPermissionService) {
        this.menuPermissionService = menuPermissionService;
    }

    /**
     * 인증된 사용자의 특정 메뉴 읽기 권한을 확인합니다.
     *
     * @param authentication JWT 인증 정보 (principal = userId Long)
     * @param menuCode       메뉴 코드
     * @return 읽기 권한 여부
     */
    public Mono<Boolean> canRead(final Authentication authentication, final String menuCode) {
        Long userId = (Long) authentication.getPrincipal();
        return menuPermissionService.canRead(userId, menuCode);
    }

    /**
     * 인증된 사용자의 특정 메뉴 쓰기 권한을 확인합니다.
     *
     * @param authentication JWT 인증 정보 (principal = userId Long)
     * @param menuCode       메뉴 코드
     * @return 쓰기 권한 여부
     */
    public Mono<Boolean> canWrite(final Authentication authentication, final String menuCode) {
        Long userId = (Long) authentication.getPrincipal();
        return menuPermissionService.canWrite(userId, menuCode);
    }
}
