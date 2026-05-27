package com.example.bootstrap.menu.domain.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 사용자-역할 매핑 엔티티.
 *
 * <p>사용자와 역할 간의 다대다 관계를 표현합니다.
 * 서로게이트 PK를 사용하여 복합 PK를 피합니다.
 */
@Table("user_roles")
public class UserRole {

    @Id
    private Long id;

    /** users.id FK. 역할을 부여받은 사용자 ID. */
    private Long userId;

    /** roles.id FK. 사용자에게 부여된 역할 ID. */
    private Long roleId;

    @CreatedDate
    private OffsetDateTime createdAt;

    /** 기본 생성자. Spring Data R2DBC가 내부적으로 사용합니다. */
    public UserRole() {
    }

    /**
     * 사용자-역할 매핑 ID를 반환합니다.
     *
     * @return 서로게이트 PK
     */
    public Long getId() {
        return id;
    }

    /**
     * 사용자-역할 매핑 ID를 설정합니다.
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
     * 역할 ID를 반환합니다.
     *
     * @return roles.id FK
     */
    public Long getRoleId() {
        return roleId;
    }

    /**
     * 역할 ID를 설정합니다.
     *
     * @param roleId roles.id FK
     */
    public void setRoleId(final Long roleId) {
        this.roleId = roleId;
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
