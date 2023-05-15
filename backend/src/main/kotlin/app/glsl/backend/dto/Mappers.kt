package app.glsl.backend.dto

import app.glsl.backend.domain.Author
import app.glsl.backend.domain.Shader

fun Author.toDto() = AuthorDto(
    id = id,
    name = name,
    githubId = githubId,
    shaders = emptyList(),
    createdAt = createdAt!!
)

fun Shader.toDto(): ShaderDto = ShaderDto(
    id = id,
    parent = null,
    children = emptyList(),
    author = null,
    body = body,
    createdAt = createdAt!!
)
