package com.xxx.campus.service;

import com.xxx.campus.model.ActivityParsedResult;

/**
 * AI 服务接口 —— 第一阶段 HTTP 直调，后续切 Spring AI 只需加一个实现类
 */
public interface AiService {

    /**
     * 解析教师文档，返回结构化活动数据
     * @param document 教师粘贴的活动大纲/文档
     * @return AI 解析结果，未提取到的字段为 null
     */
    ActivityParsedResult parseActivity(String document);
}
