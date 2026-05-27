package com.example.bootstrap.menu.domain.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 메뉴 엔티티.
 *
 * <p>시스템에 등록된 메뉴 항목을 표현합니다.
 * code는 메뉴를 식별하는 고유 코드이며, isActive로 노출 여부를 제어합니다.
 */
@Table("menus")
public class Menu {

    @Id
    private Long id;

    private String code;

    private String name;

    private Integer displayOrder;

    private Boolean isActive;

    @CreatedDate
    private OffsetDateTime createdAt;

    /** 기본 생성자. Spring Data R2DBC가 내부적으로 사용합니다. */
    public Menu() {
    }

    /**
     * 메뉴 ID를 반환합니다.
     *
     * @return 메뉴 PK
     */
    public Long getId() {
        return id;
    }

    /**
     * 메뉴 ID를 설정합니다.
     *
     * @param id 메뉴 PK
     */
    public void setId(final Long id) {
        this.id = id;
    }

    /**
     * 메뉴 코드를 반환합니다.
     *
     * @return 메뉴 고유 코드
     */
    public String getCode() {
        return code;
    }

    /**
     * 메뉴 코드를 설정합니다.
     *
     * @param code 메뉴 고유 코드
     */
    public void setCode(final String code) {
        this.code = code;
    }

    /**
     * 메뉴 이름을 반환합니다.
     *
     * @return 메뉴 표시 이름
     */
    public String getName() {
        return name;
    }

    /**
     * 메뉴 이름을 설정합니다.
     *
     * @param name 메뉴 표시 이름
     */
    public void setName(final String name) {
        this.name = name;
    }

    /**
     * 표시 순서를 반환합니다.
     *
     * @return 메뉴 표시 순서
     */
    public Integer getDisplayOrder() {
        return displayOrder;
    }

    /**
     * 표시 순서를 설정합니다.
     *
     * @param displayOrder 메뉴 표시 순서
     */
    public void setDisplayOrder(final Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    /**
     * 메뉴 활성화 여부를 반환합니다.
     *
     * @return 활성화 여부
     */
    public Boolean isActive() {
        return isActive;
    }

    /**
     * 메뉴 활성화 여부를 설정합니다.
     *
     * @param isActive 활성화 여부
     */
    public void setActive(final Boolean isActive) {
        this.isActive = isActive;
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
