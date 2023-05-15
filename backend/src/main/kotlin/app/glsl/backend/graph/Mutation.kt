package app.glsl.backend.graph

import app.glsl.backend.dto.ShaderDto
import app.glsl.backend.dto.toDto
import app.glsl.backend.service.AuthorService
import app.glsl.backend.service.ShaderService
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsMutation
import com.netflix.graphql.dgs.InputArgument
import org.springframework.security.access.annotation.Secured

@DgsComponent
class Mutation(private val shaderService: ShaderService, private val authorService: AuthorService) {
    @DgsMutation
    fun shareShader(@InputArgument shader: String, @InputArgument parentId: String?): ShaderDto {
        return shaderService.shareShader(parentId, shader).toDto()
    }

    @DgsMutation
    @Secured("AUTHOR")
    fun publishShader(@InputArgument shader: String, @InputArgument parentId: String?): ShaderDto {
        val author = authorService.contextAuthor
        val newShader = shaderService.publishShader(author, parentId, shader)

        return newShader.toDto()
    }
}
