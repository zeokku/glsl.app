package app.glsl.backend.repository

import app.glsl.backend.domain.Shader
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ShaderRepository : JpaRepository<Shader, String> {
    @Query(
        """
        select s from Shader s
        where (:parentId is null or s.parent.id = :parentId)
        and (:authorId is null or s.author.id = :authorId)
    """
    )
    fun findAllByParentIdAndAuthorId(pageable: Pageable, parentId: String?, authorId: String?): Page<Shader>
}
