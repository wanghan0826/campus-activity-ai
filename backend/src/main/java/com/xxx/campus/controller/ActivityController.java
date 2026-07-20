package com.xxx.campus.controller;

import com.xxx.campus.model.Activity;
import com.xxx.campus.model.ActivityParsedResult;
import com.xxx.campus.model.ActivityRequest;
import com.xxx.campus.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 活动管理接口
 */
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    /**
     * 解析活动文档
     * POST /api/activities/parse
     * @param request 包含教师粘贴的文档
     * @return 解析结果 + 校验状态
     */
    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseActivity(@Valid @RequestBody ActivityRequest request) {
        // 暂时使用固定的 creatorId
        String creatorId = "test_teacher_001";

        Map<String, Object> result = activityService.parseDocument(request.getDocument(), creatorId);
        return ResponseEntity.ok(result);
    }

    /**
     * 创建活动
     * POST /api/activities
     * @param result AI 解析结果（可能经过教师修改）
     * @return 创建成功的活动
     */
    @PostMapping
    public ResponseEntity<Activity> createActivity(@Valid @RequestBody ActivityParsedResult result) {
        // 暂时使用固定的 creatorId
        String creatorId = "test_teacher_001";

        Activity activity = activityService.createActivity(result, creatorId);
        return ResponseEntity.ok(activity);
    }
}
