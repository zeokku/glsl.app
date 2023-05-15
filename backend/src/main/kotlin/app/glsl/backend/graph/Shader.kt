package app.glsl.backend.graph

import app.glsl.backend.domain.Shader
import app.glsl.backend.dto.AuthorDto
import app.glsl.backend.dto.ShaderDto
import app.glsl.backend.dto.toDto
import app.glsl.backend.service.ShaderService
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.InputArgument

@DgsComponent
class Shader(private val shaderService: ShaderService) {
    @DgsData(parentType = "Shader")
    fun parent(dfe: DgsDataFetchingEnvironment): ShaderDto? =
        shaderService.findShader(dfe.getSource<ShaderDto>().id)?.parent?.toDto()

    @DgsData(parentType = "Shader")
    fun children(
        @InputArgument limit: Int?,
        @InputArgument offset: Int?,
        @InputArgument authoredBy: String?,
        dfe: DgsDataFetchingEnvironment
    ): List<ShaderDto> =
        shaderService.findShaders(limit, offset, authoredBy, dfe.getSource<ShaderDto>().id).map(Shader::toDto)

    @DgsData(parentType = "Shader")
    fun author(dfe: DgsDataFetchingEnvironment): AuthorDto? =
        shaderService.findShader(dfe.getSource<ShaderDto>().id)?.author?.toDto()
}
