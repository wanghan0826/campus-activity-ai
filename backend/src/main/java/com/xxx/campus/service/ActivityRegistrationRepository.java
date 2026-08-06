package com.xxx.campus.service;

import com.xxx.campus.model.ActivityRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ActivityRegistrationRepository extends JpaRepository<ActivityRegistration, Long> {
    Optional<ActivityRegistration> findByActivityIdAndStudentId(Long activityId, String studentId);

    List<ActivityRegistration> findByStudentIdOrderByUpdatedAtDesc(String studentId);

    List<ActivityRegistration> findByActivityIdOrderByCreatedAtAsc(Long activityId);

    Optional<ActivityRegistration> findByIdAndActivityId(Long id, Long activityId);

    long countByActivityIdAndStatusIn(Long activityId, Collection<String> statuses);
}
