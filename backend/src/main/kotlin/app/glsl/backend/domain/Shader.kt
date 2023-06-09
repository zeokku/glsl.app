package app.glsl.backend.domain

import io.github.thibaultmeyer.cuid.CUID
import jakarta.persistence.*
import java.time.Instant

@Entity
class Shader(
    @Column(unique = true, length = 5000)
    var body: String,

    @ManyToOne(fetch = FetchType.LAZY)
    var parent: Shader? = null,

    @OneToMany(fetch = FetchType.LAZY, targetEntity = Shader::class, mappedBy = "parent")
    var children: List<Shader> = emptyList(),

    @ManyToOne(fetch = FetchType.LAZY)
    var author: Author? = null,

    var createdAt: Instant = Instant.now(),

    @Id
    var id: String = CUID.randomCUID2().toString()
)
