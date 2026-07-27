package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Activity> findByStatusOrderByCreatedAtDesc(String status);

    Optional<Activity> findByIdAndCreatorId(Long id, String creatorId);

    @Query("""
            select a from Activity a
            where a.creatorId = :creatorId
              and (:status is null or a.status = :status)
              and (:keyword is null
                   or lower(a.title) like lower(concat('%', :keyword, '%'))
                   or lower(coalesce(a.location, '')) like lower(concat('%', :keyword, '%'))
                   or lower(coalesce(a.organizer, '')) like lower(concat('%', :keyword, '%')))
            order by a.updatedAt desc
            """)
    Page<Activity> searchOwnedActivities(@Param("creatorId") String creatorId,
                                         @Param("status") String status,
                                         @Param("keyword") String keyword,
                                         Pageable pageable);

    @Query("select a.status, count(a) from Activity a where a.creatorId = :creatorId group by a.status")
    List<Object[]> countOwnedByStatus(@Param("creatorId") String creatorId);
}
