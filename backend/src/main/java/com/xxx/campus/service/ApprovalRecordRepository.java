package com.xxx.campus.service;

import com.xxx.campus.model.ApprovalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalRecordRepository extends JpaRepository<ApprovalRecord, Long> {
    List<ApprovalRecord> findByActivityIdOrderByCreatedAtAscIdAsc(Long activityId);
}
