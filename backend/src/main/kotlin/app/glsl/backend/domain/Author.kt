package app.glsl.backend.domain

import io.github.thibaultmeyer.cuid.CUID
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant

@Entity
class Author(
    var name: String,

    var githubId: Int,

    @OneToMany(fetch = FetchType.LAZY, targetEntity = Shader::class)
    var shaders: List<Shader>? = null,

    @CreationTimestamp
    var createdAt: Instant? = null,

    @Id
    var id: String = CUID.randomCUID2().toString()
)
