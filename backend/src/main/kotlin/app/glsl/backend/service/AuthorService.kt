package app.glsl.backend.service

import app.glsl.backend.domain.Author
import app.glsl.backend.repository.AuthorRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AuthorService(private val authorRepository: AuthorRepository) {
    fun trySaveAuthor(githubId: Int, displayName: String) {
        if (authorRepository.findByGithubId(githubId).isEmpty) {
            authorRepository.save(Author(displayName, githubId))
        }
    }
}
