package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.UserMenuPermission;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

/**
 * 사용자-메뉴 권한 R2DBC 리포지토리.
 *
 * <p>사용자 ID 기반 개별 메뉴 권한 조회를 지원합니다.
 */
@Repository
public interface UserMenuPermissionRepository extends ReactiveCrudRepository<UserMenuPermission, Long> {

    /**
     * 사용자 ID로 메뉴 권한 목록을 조회합니다.
     *
     * @param userId users.id FK
     * @return 해당 사용자의 메뉴 권한 목록
     */
    Flux<UserMenuPermission> findByUserId(Long userId);
}
