package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.RoleMenuPermission;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.Collection;

/**
 * 역할-메뉴 권한 R2DBC 리포지토리.
 *
 * <p>역할 ID 단건 또는 다건 기반 권한 조회를 지원합니다.
 */
@Repository
public interface RoleMenuPermissionRepository extends ReactiveCrudRepository<RoleMenuPermission, Long> {

    /**
     * 역할 ID로 메뉴 권한 목록을 조회합니다.
     *
     * @param roleId roles.id FK
     * @return 해당 역할의 메뉴 권한 목록
     */
    Flux<RoleMenuPermission> findByRoleId(Long roleId);

    /**
     * 복수 역할 ID로 메뉴 권한 목록을 조회합니다.
     *
     * @param roleIds 역할 ID 컬렉션
     * @return 해당 역할들의 메뉴 권한 목록
     */
    Flux<RoleMenuPermission> findByRoleIdIn(Collection<Long> roleIds);
}
