package com.xxx.campus.service;

import com.xxx.campus.model.NotificationGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationGroupRepository extends JpaRepository<NotificationGroup, Long> {
    List<NotificationGroup> findAllByOrderByEnabledDescNameAsc();
    Optional<NotificationGroup> findByNameIgnoreCase(String name);
}
