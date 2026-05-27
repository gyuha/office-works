package com.example.bootstrap.menu.domain.repository;

import com.example.bootstrap.menu.domain.model.Menu;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

/**
 * 메뉴 R2DBC 리포지토리.
 *
 * <p>메뉴 코드 기반 조회를 지원합니다.
 */
@Repository
public interface MenuRepository extends ReactiveCrudRepository<Menu, Long> {

    /**
     * 메뉴 코드로 메뉴를 조회합니다.
     *
     * @param code 메뉴 고유 코드
     * @return 메뉴 (없으면 empty Mono)
     */
    Mono<Menu> findByCode(String code);
}
