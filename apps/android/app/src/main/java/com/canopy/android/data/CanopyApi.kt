package com.canopy.android.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

class CanopyApi(private val baseUrl: String, private val tokenProvider: suspend () -> String?) {
    private val http = HttpClient(Android) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun login(email: String, password: String): AuthResponse =
        http.post("$baseUrl/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(AuthRequest(email, password))
        }.body()

    suspend fun projects(): Page<ProjectDto> = authedGet("$baseUrl/projects")
    suspend fun project(projectId: String): ProjectDto = authedGet("$baseUrl/projects/$projectId")
    suspend fun lineage(projectId: String): LineageDto = authedGet("$baseUrl/projects/$projectId/lineage")
    suspend fun version(versionId: String): VersionDto = authedGet("$baseUrl/versions/$versionId")
    suspend fun assetUrl(assetId: String): AssetUrlDto = authedGet("$baseUrl/assets/$assetId/url")
    suspend fun memories(projectId: String): Page<MemoryDto> = authedGet("$baseUrl/projects/$projectId/memories")

    private suspend inline fun <reified T> authedGet(url: String): T =
        http.get(url) { tokenProvider()?.let { bearerAuth(it) } }.body()
}
