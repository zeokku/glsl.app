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
class Author(private val shaderService: ShaderService) {
    @DgsData(parentType = "Author")
    fun shaders(
        @InputArgument limit: Int?,
        @InputArgument offset: Int?,
        @InputArgument childrenOf: String?,
        dfe: DgsDataFetchingEnvironment
    ): List<ShaderDto> =
        shaderService.findShaders(limit, offset, dfe.getSource<AuthorDto>().id, childrenOf).map(Shader::toDto)
}
