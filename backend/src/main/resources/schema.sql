-- ============================================
-- xxx 校园活动平台 - 数据库初始化
-- ============================================

CREATE TABLE IF NOT EXISTS activity (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    title            VARCHAR(200)  NOT NULL COMMENT '活动标题',
    category         VARCHAR(20)   NOT NULL COMMENT '活动分类: ART/SPORTS/PRACTICE/LIFE/FEATURE',
    campus           VARCHAR(100)  COMMENT '校区',
    location         VARCHAR(200)  NOT NULL COMMENT '活动地点',
    organizer        VARCHAR(100)  COMMENT '组织者',
    cover_image      VARCHAR(500)  COMMENT '封面图片URL',
    content          TEXT          NOT NULL COMMENT '活动内容（AI润色后）',
    raw_document     TEXT          COMMENT '教师提交的原始文档',
    start_time       DATETIME      NOT NULL COMMENT '活动开始时间',
    end_time         DATETIME      NOT NULL COMMENT '活动结束时间',
    reg_start_time   DATETIME      COMMENT '报名开始时间',
    reg_end_time     DATETIME      COMMENT '报名结束时间',
    publish_time     DATETIME      COMMENT '上架时间（学生可见）',
    offline_time     DATETIME      COMMENT '下架时间',
    max_participants INT           COMMENT '最大报名人数',
    review_dept      VARCHAR(100)  COMMENT '审核部门（系统匹配）',
    review_teacher   VARCHAR(100)  COMMENT '审核老师（系统匹配）',
    review_leader    VARCHAR(100)  COMMENT '分管领导（系统匹配）',
    promo_approved   BOOLEAN       COMMENT '宣传品是否已通过审核',
    status           VARCHAR(20)   NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PENDING_APPROVAL/APPROVED/PUBLISHED/OFFLINE/REJECTED',
    creator_id       VARCHAR(100)  NOT NULL COMMENT '创建人userid',
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_creator (creator_id),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动表';
