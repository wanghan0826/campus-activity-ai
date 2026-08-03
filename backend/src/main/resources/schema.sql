-- ============================================
-- xxx 校园活动平台 - 数据库初始化
-- ============================================

CREATE TABLE IF NOT EXISTS activity (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    title            VARCHAR(200)  COMMENT '活动标题，草稿阶段允许为空',
    category         VARCHAR(20)   COMMENT '活动分类: ART/SPORTS/PRACTICE/LIFE/FEATURE',
    campus           VARCHAR(100)  COMMENT '校区',
    location         VARCHAR(200)  COMMENT '活动地点，草稿阶段允许为空',
    organizer        VARCHAR(100)  COMMENT '组织者',
    cover_image      VARCHAR(500)  COMMENT '封面图片URL',
    cover_image_prompt VARCHAR(500) COMMENT 'AI封面图提示词',
    content          TEXT          COMMENT '活动内容（AI润色后）',
    raw_document     TEXT          COMMENT '教师提交的原始文档',
    creation_mode    VARCHAR(20)   NOT NULL DEFAULT 'AI' COMMENT 'AI/MANUAL',
    target_audience  VARCHAR(300)  COMMENT '活动面向对象',
    contact_info     VARCHAR(200)  COMMENT '联系人及联系方式',
    start_time       DATETIME      COMMENT '活动开始时间，草稿阶段允许为空',
    end_time         DATETIME      COMMENT '活动结束时间，草稿阶段允许为空',
    reg_start_time   DATETIME      COMMENT '报名开始时间',
    reg_end_time     DATETIME      COMMENT '报名结束时间',
    publish_time     DATETIME      COMMENT '上架时间（学生可见）',
    offline_time     DATETIME      COMMENT '下架时间',
    max_participants INT           COMMENT '最大报名人数',
    budget           DECIMAL(12,2) COMMENT '预估预算',
    registration_required BOOLEAN  DEFAULT TRUE COMMENT '是否需要报名',
    registration_approval_required BOOLEAN DEFAULT FALSE COMMENT '报名是否需要审核',
    recognition_type VARCHAR(20)   NOT NULL DEFAULT 'NONE' COMMENT 'NONE/CREDIT/VOLUNTEER/BOTH',
    second_class_credits DECIMAL(6,2) COMMENT '第二课堂学分',
    volunteer_hours  DECIMAL(6,2)  COMMENT '志愿服务时长',
    check_in_mode    VARCHAR(20)   NOT NULL DEFAULT 'QR' COMMENT 'QR/MANUAL/NONE',
    participation_requirements VARCHAR(500) COMMENT '参与及认定要求',
    review_dept      VARCHAR(100)  COMMENT '审核部门（系统匹配）',
    review_teacher   VARCHAR(100)  COMMENT '审核老师（系统匹配）',
    review_leader    VARCHAR(100)  COMMENT '分管领导（系统匹配）',
    promo_approved   BOOLEAN       COMMENT '宣传品是否已通过审核',
    approval_message VARCHAR(500)  COMMENT '提交审批时的附加留言',
    submitted_at     DATETIME      COMMENT '提交审批时间',
    approval_stage   VARCHAR(30)   COMMENT '当前节点: COLLEGE_REVIEWER/COLLEGE_LEADER/COMPLETED/REJECTED',
    approval_round   INT           NOT NULL DEFAULT 0 COMMENT '审批轮次',
    teacher_reviewed_at DATETIME   COMMENT '学院审核老师处理时间',
    leader_reviewed_at  DATETIME   COMMENT '学院领导处理时间',
    approved_at      DATETIME      COMMENT '两级审批完成时间',
    calendar_event_id VARCHAR(100) COMMENT '企业微信日程ID',
    status           VARCHAR(20)   NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PENDING_APPROVAL/APPROVED/PUBLISHED/OFFLINE/REJECTED',
    creator_id       VARCHAR(100)  NOT NULL COMMENT '创建人userid',
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_creator (creator_id),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动表';

CREATE TABLE IF NOT EXISTS activity_schedule (
    activity_id      BIGINT       NOT NULL,
    sort_order       INT          NOT NULL,
    schedule_time    VARCHAR(100),
    schedule_content VARCHAR(500),
    PRIMARY KEY (activity_id, sort_order),
    CONSTRAINT fk_schedule_activity FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_material (
    activity_id BIGINT       NOT NULL,
    sort_order  INT          NOT NULL,
    material    VARCHAR(200),
    PRIMARY KEY (activity_id, sort_order),
    CONSTRAINT fk_material_activity FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_approval_record (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    activity_id      BIGINT       NOT NULL,
    approval_round   INT          NOT NULL,
    step             VARCHAR(30)  NOT NULL COMMENT 'PUBLISHER/COLLEGE_REVIEWER/COLLEGE_LEADER',
    action           VARCHAR(20)  NOT NULL COMMENT 'SUBMITTED/APPROVED/REJECTED',
    operator_id      VARCHAR(100) NOT NULL,
    operator_role    VARCHAR(30)  NOT NULL,
    comment          VARCHAR(500),
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_approval_activity (activity_id),
    INDEX idx_approval_operator (operator_id),
    CONSTRAINT fk_approval_activity FOREIGN KEY (activity_id) REFERENCES activity(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动审批轨迹';
