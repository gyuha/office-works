package com.example.bootstrap.menu.application.dto;

/**
 * 내 메뉴 권한 응답 DTO.
 *
 * @param menuId   메뉴 ID
 * @param code     메뉴 코드
 * @param name     메뉴 이름
 * @param canRead  읽기 권한 여부
 * @param canWrite 쓰기 권한 여부
 */
public record MyMenuResponse(Long menuId, String code, String name,
                              boolean canRead, boolean canWrite) {
}
