package com.example.bootstrap.menu.controller;

import com.example.bootstrap.global.TestcontainersConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.UUID;

/**
 * MenuController 통합 테스트.
 *
 * <p>TestContainers PostgreSQL + Redis를 사용하여 전체 스택을 구동합니다.
 * GET /api/menus/my 엔드포인트의 인증/권한 시나리오를 End-to-End로 검증합니다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("local")
@Import(TestcontainersConfig.class)
@DisplayName("MenuController 통합 테스트")
class MenuControllerIT {

    private static final String UPDATE_ROLE_SQL =
            "UPDATE users SET role = 'ADMIN' WHERE email = ?";

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String userAccessToken;
    private String adminAccessToken;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String userEmail = "menu_user_" + uid + "@example.com";
        String adminEmail = "menu_admin_" + uid + "@example.com";

        // USER 계정 등록 + 로그인
        registerUser(userEmail);
        userAccessToken = login(userEmail);

        // ADMIN 계정 등록 → role 업데이트 → 재로그인
        registerUser(adminEmail);
        jdbcTemplate.update(UPDATE_ROLE_SQL, adminEmail);
        adminAccessToken = login(adminEmail);
    }

    @Test
    @DisplayName("GET /api/menus/my — 유효한 USER 토큰으로 요청하면 200과 배열을 반환한다")
    void getMyMenus_withValidUserToken_returnsOkWithArray() {
        webTestClient.get().uri("/api/menus/my")
                .header("Authorization", "Bearer " + userAccessToken)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.code").isEqualTo("SUCCESS")
                .jsonPath("$.data").isArray();
    }

    @Test
    @DisplayName("GET /api/menus/my — Bearer 토큰 없이 요청하면 401을 반환한다")
    void getMyMenus_withoutToken_returns401() {
        webTestClient.get().uri("/api/menus/my")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    @DisplayName("GET /api/menus/my — 역할 미할당 USER 토큰으로 요청하면 빈 배열과 200을 반환한다")
    void getMyMenus_withUserNoRoles_returnsEmptyArray() {
        webTestClient.get().uri("/api/menus/my")
                .header("Authorization", "Bearer " + userAccessToken)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.code").isEqualTo("SUCCESS")
                .jsonPath("$.data").isArray()
                .jsonPath("$.data.length()").isEqualTo(0);
    }

    @Test
    @DisplayName("GET /api/menus/my — ADMIN 토큰으로 요청하면 전체 활성 메뉴를 canRead=true, canWrite=true로 반환한다")
    void getMyMenus_withAdminToken_returnsAllMenusWithFullPermission() {
        webTestClient.get().uri("/api/menus/my")
                .header("Authorization", "Bearer " + adminAccessToken)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.code").isEqualTo("SUCCESS")
                .jsonPath("$.data").isArray();
    }

    private void registerUser(final String email) {
        String body = String.format(
                "{\"email\":\"%s\",\"password\":\"pass1234\",\"nickname\":\"TestUser\"}", email);
        webTestClient.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchange()
                .expectStatus().isCreated();
    }

    private String login(final String email) {
        String[] token = new String[1];
        String body = String.format("{\"email\":\"%s\",\"password\":\"pass1234\"}", email);
        webTestClient.post().uri("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.data.accessToken").value(t -> token[0] = (String) t);
        return token[0];
    }
}
