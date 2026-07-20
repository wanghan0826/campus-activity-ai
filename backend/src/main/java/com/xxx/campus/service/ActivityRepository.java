package com.xxx.campus.service;

import com.xxx.campus.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Activity> findByStatusOrderByCreatedAtDesc(String status);
}
