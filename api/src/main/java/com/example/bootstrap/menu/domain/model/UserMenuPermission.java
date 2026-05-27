package com.example.bootstrap.menu.domain.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 사용자-메뉴 권한 엔티티.
 *
 * <p>특정 사용자가 특정 메뉴에 대해 갖는 개별 읽기/쓰기 권한을 표현합니다.
 * 역할 기반 권한을 사용자 단위로 재정의하는 용도로 사용합니다.
 * 서로게이트 PK를 사용하여 복합 PK를 피합니다.
 */
@Table("user_menu_permissions")
public class UserMenuPermission {

    @Id
    private Long id;

    /** users.id FK. 권한이 부여된 사용자 ID. */
    private Long userId;

    /** menus.id FK. 권한 대상 메뉴 ID. */
    private Long menuId;

    private Boolean canRead;

    private Boolean canWrite;

    @CreatedDate
    private OffsetDateTime createdAt;

    /** 기본 생성자. Spring Data R2DBC가 내부적으로 사용합니다. */
    public UserMenuPermission() {
    }

    /**
     * 사용자-메뉴 권한 ID를 반환합니다.
     *
     * @return 서로게이트 PK
     */
    public Long getId() {
        return id;
    }

    /**
     * 사용자-메뉴 권한 ID를 설정합니다.
     *
     * @param id 서로게이트 PK
     */
    public void setId(final Long id) {
        this.id = id;
    }

    /**
     * 사용자 ID를 반환합니다.
     *
     * @return users.id FK
     */
    public Long getUserId() {
        return userId;
    }

    /**
     * 사용자 ID를 설정합니다.
     *
     * @param userId users.id FK
     */
    public void setUserId(final Long userId) {
        this.userId = userId;
    }

    /**
     * 메뉴 ID를 반환합니다.
     *
     * @return menus.id FK
     */
    public Long getMenuId() {
        return menuId;
    }

    /**
     * 메뉴 ID를 설정합니다.
     *
     * @param menuId menus.id FK
     */
    public void setMenuId(final Long menuId) {
        this.menuId = menuId;
    }

    /**
     * 읽기 권한 여부를 반환합니다.
     *
     * @return 읽기 권한 여부
     */
    public Boolean getCanRead() {
        return canRead;
    }

    /**
     * 읽기 권한 여부를 설정합니다.
     *
     * @param canRead 읽기 권한 여부
     */
    public void setCanRead(final Boolean canRead) {
        this.canRead = canRead;
    }

    /**
     * 쓰기 권한 여부를 반환합니다.
     *
     * @return 쓰기 권한 여부
     */
    public Boolean getCanWrite() {
        return canWrite;
    }

    /**
     * 쓰기 권한 여부를 설정합니다.
     *
     * @param canWrite 쓰기 권한 여부
     */
    public void setCanWrite(final Boolean canWrite) {
        this.canWrite = canWrite;
    }

    /**
     * 생성일시를 반환합니다.
     *
     * @return 생성일시 (UTC 오프셋 포함)
     */
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * 생성일시를 설정합니다.
     *
     * @param createdAt 생성일시
     */
    public void setCreatedAt(final OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
