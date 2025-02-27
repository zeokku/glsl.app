package app.glsl.backend.service

import app.glsl.backend.domain.Author
import app.glsl.backend.repository.AuthorRepository
import app.glsl.backend.util.unwrap
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AuthorService(private val authorRepository: AuthorRepository) {
    val contextAuthor get() = SecurityContextHolder.getContext().authentication.principal as Author

    fun findOrCreateAuthor(githubId: Int, displayName: String): Author {
        val author = authorRepository.findByGithubId(githubId)
        if (author != null) return author

        return authorRepository.save(Author(displayName, githubId))
    }

    fun findAuthorById(id: String): Author? = authorRepository.findById(id).unwrap()
}
