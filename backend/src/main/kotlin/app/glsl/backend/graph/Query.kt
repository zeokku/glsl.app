package app.glsl.backend.graph

import app.glsl.backend.domain.Shader
import app.glsl.backend.dto.ShaderDto
import app.glsl.backend.dto.toDto
import app.glsl.backend.service.ShaderService
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsQuery
import com.netflix.graphql.dgs.InputArgument

@DgsComponent
class Query(private val shaderService: ShaderService) {
    @DgsQuery
    fun shader(@InputArgument id: String): ShaderDto? = shaderService.findShader(id)?.toDto()

    @DgsQuery
    fun shaders(
        @InputArgument limit: Int?,
        @InputArgument offset: Int?,
        @InputArgument authoredBy: String?,
        @InputArgument childrenOf: String?
    ): List<ShaderDto> = shaderService.findShaders(limit, offset, authoredBy, childrenOf).map(Shader::toDto)
}
