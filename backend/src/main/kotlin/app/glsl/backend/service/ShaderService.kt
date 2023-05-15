package app.glsl.backend.service

import app.glsl.backend.domain.Author
import app.glsl.backend.domain.Shader
import app.glsl.backend.repository.ShaderRepository
import app.glsl.backend.util.OffsetBasedPageRequest
import app.glsl.backend.util.reference
import app.glsl.backend.util.unwrap
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service

@Service
class ShaderService(private val shaderRepository: ShaderRepository) {
    fun shareShader(parentId: String?, body: String): Shader =
        shaderRepository.save(Shader(body = body, parent = shaderRepository.reference(parentId)))

    fun publishShader(author: Author, parentId: String?, body: String): Shader =
        shaderRepository.save(Shader(body = body, parent = shaderRepository.reference(parentId), author = author))

    fun findShader(id: String): Shader? = shaderRepository.findById(id).unwrap()

    fun findShaders(limit: Int?, offset: Int?, authoredBy: String?, childrenOf: String?): List<Shader> {
        val limitOrDefault = limit ?: 15
        val offsetOrDefault = offset ?: 0
        val defaultSort = Sort.sort(Shader::class.java).by(Shader::createdAt).descending()
        val pageRequest = OffsetBasedPageRequest(offsetOrDefault, limitOrDefault, defaultSort)

        return shaderRepository.findAllByParentIdAndAuthorId(pageRequest, childrenOf, authoredBy).toList()
    }
}
