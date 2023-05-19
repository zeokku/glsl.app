package app.glsl.backend.util

import jakarta.persistence.EntityNotFoundException
import org.springframework.data.domain.Example
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

operator fun <T : Any, I> JpaRepository<T, I>.contains(element: T): Boolean = exists(Example.of(element))

fun <T : Any, I : Any> JpaRepository<T, I>.reference(toId: I?): T? =
    if (toId == null) null
    else try {
        getReferenceById(toId)
    } catch (e: EntityNotFoundException) {
        null
    }

fun <T> Optional<T>.unwrap(): T? = orElse(null)
