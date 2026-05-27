package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.Role;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

/**
 * 역할 R2DBC 리포지토리.
 *
 * <p>역할 전체 조회는 기본 제공되는 {@code findAll()}을 사용합니다.
 */
@Repository
public interface RoleRepository extends ReactiveCrudRepository<Role, Long> {
}
