package app.glsl.backend.repository

import app.glsl.backend.domain.Author
import io.github.thibaultmeyer.cuid.CUID
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface AuthorRepository : JpaRepository<Author, CUID> {
    fun findByGithubId(githubId: Int): Optional<Author>
}
