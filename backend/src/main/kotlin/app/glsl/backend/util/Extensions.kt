package app.glsl.backend.util

import org.springframework.data.domain.Example
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

operator fun <T : Any, I> JpaRepository<T, I>.contains(element: T): Boolean = exists(Example.of(element))

fun <T> Optional<T>.unwrap(): T? = orElse(null)
