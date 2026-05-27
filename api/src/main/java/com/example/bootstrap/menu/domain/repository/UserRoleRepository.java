package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.UserRole;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

/**
 * 사용자-역할 매핑 R2DBC 리포지토리.
 *
 * <p>사용자 ID 또는 역할 ID 기반 조회를 지원합니다.
 */
@Repository
public interface UserRoleRepository extends ReactiveCrudRepository<UserRole, Long> {

    /**
     * 사용자 ID로 역할 매핑 목록을 조회합니다.
     *
     * @param userId users.id FK
     * @return 해당 사용자의 역할 매핑 목록
     */
    Flux<UserRole> findByUserId(Long userId);

    /**
     * 역할 ID로 역할 매핑 목록을 조회합니다.
     *
     * @param roleId roles.id FK
     * @return 해당 역할에 속한 사용자 매핑 목록
     */
    Flux<UserRole> findByRoleId(Long roleId);
}
