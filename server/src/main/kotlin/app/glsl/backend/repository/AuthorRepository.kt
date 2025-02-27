package app.glsl.backend.repository

import app.glsl.backend.domain.Author
import org.springframework.data.jpa.repository.JpaRepository

interface AuthorRepository : JpaRepository<Author, String> {
    fun findByGithubId(githubId: Int): Author?
}
