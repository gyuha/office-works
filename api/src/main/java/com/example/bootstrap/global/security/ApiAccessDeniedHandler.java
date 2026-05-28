package com.example.bootstrap.global.security;

import com.example.bootstrap.global.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.server.authorization.ServerAccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 403 Forbidden 커스텀 응답 핸들러.
 *
 * <p>권한 없는 요청 시 {@link ApiResponse} envelope 형식으로 403을 반환합니다.
 */
@Component
public class ApiAccessDeniedHandler implements ServerAccessDeniedHandler {

    private final ObjectMapper objectMapper;

    /**
     * @param objectMapper JSON 직렬화에 사용할 ObjectMapper
     */
    public ApiAccessDeniedHandler(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(final ServerWebExchange exchange, final AccessDeniedException denied) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        final byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(
                    ApiResponse.error("MENU_002", "메뉴 접근 권한이 없습니다."));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize access denied response", e);
        }

        response.getHeaders().setContentLength(bytes.length);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
