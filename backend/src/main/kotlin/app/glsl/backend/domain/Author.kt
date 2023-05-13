package app.glsl.backend.domain

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.GenericGenerator
import java.time.Instant

@Entity
class Author(
    var name: String,

    var githubId: Int,

    @Id
    @GenericGenerator(name = "cuid", strategy = "app.glsl.backend.util.CuidGenerator")
    @GeneratedValue(generator = "cuid")
    var id: String? = null,

    @CreationTimestamp
    var createdAt: Instant? = null
)
