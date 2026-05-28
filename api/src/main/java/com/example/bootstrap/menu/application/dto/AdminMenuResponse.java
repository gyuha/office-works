package com.example.bootstrap.menu.application.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * ADMIN 전용 전체 메뉴 조회 응답 DTO.
 *
 * @param menuId       메뉴 ID
 * @param code         메뉴 코드
 * @param name         메뉴 이름
 * @param displayOrder 표시 순서
 * @param isActive     활성화 여부
 */
public record AdminMenuResponse(Long menuId, String code, String name,
                                Integer displayOrder,
                                @JsonProperty("isActive") Boolean isActive) {
}
