package com.example.bootstrap.menu.domain.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 역할 엔티티.
 *
 * <p>사용자에게 부여할 수 있는 역할을 표현합니다.
 * 역할은 메뉴 접근 권한의 집합 단위입니다.
 */
@Table("roles")
public class Role {

    @Id
    private Long id;

    private String name;

    /** 역할 설명. 선택 항목으로 null 가능. */
    private String description;

    @CreatedDate
    private OffsetDateTime createdAt;

    /** 기본 생성자. Spring Data R2DBC가 내부적으로 사용합니다. */
    public Role() {
    }

    /**
     * 역할 ID를 반환합니다.
     *
     * @return 역할 PK
     */
    public Long getId() {
        return id;
    }

    /**
     * 역할 ID를 설정합니다.
     *
     * @param id 역할 PK
     */
    public void setId(final Long id) {
        this.id = id;
    }

    /**
     * 역할 이름을 반환합니다.
     *
     * @return 역할 이름
     */
    public String getName() {
        return name;
    }

    /**
     * 역할 이름을 설정합니다.
     *
     * @param name 역할 이름
     */
    public void setName(final String name) {
        this.name = name;
    }

    /**
     * 역할 설명을 반환합니다.
     *
     * @return 역할 설명 (nullable)
     */
    public String getDescription() {
        return description;
    }

    /**
     * 역할 설명을 설정합니다.
     *
     * @param description 역할 설명 (nullable)
     */
    public void setDescription(final String description) {
        this.description = description;
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
