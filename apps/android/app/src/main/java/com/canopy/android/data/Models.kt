package com.canopy.android.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable data class AuthRequest(val email: String, val password: String)
@Serializable data class AuthResponse(@SerialName("access_token") val accessToken: String)
@Serializable data class Page<T>(val data: List<T> = emptyList())

@Serializable data class ProjectDto(
    val id: String,
    val name: String,
    @SerialName("creative_goal") val creativeGoal: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable data class LineageDto(
    val versions: List<VersionDto> = emptyList(),
    val edges: List<LineageEdgeDto> = emptyList(),
    @SerialName("branch_points") val branchPoints: List<String> = emptyList(),
    val tips: List<String> = emptyList()
)

@Serializable data class LineageEdgeDto(
    @SerialName("version_id") val versionId: String,
    @SerialName("parent_version_id") val parentVersionId: String,
    @SerialName("parent_index") val parentIndex: Int,
    val role: String
)

@Serializable data class VersionDto(
    val id: String,
    @SerialName("project_id") val projectId: String,
    @SerialName("asset_id") val assetId: String? = null,
    val sequence: Int,
    @SerialName("actor_type") val actorType: String? = null,
    @SerialName("actor_model") val actorModel: String? = null,
    val action: ActionDto? = null,
    val parents: List<LineageEdgeDto> = emptyList(),
    val summary: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable data class ActionDto(val type: String, val params: Map<String, String>? = null)
@Serializable data class AssetUrlDto(@SerialName("asset_id") val assetId: String, val url: String, @SerialName("expires_in") val expiresIn: Int)
@Serializable data class MemoryDto(val id: String, val type: String, val statement: String, val status: String)
@Serializable data class CopilotRequest(val question: String)
