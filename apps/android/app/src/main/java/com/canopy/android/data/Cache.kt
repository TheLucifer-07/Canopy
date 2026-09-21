package com.canopy.android.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

@Entity(tableName = "projects")
data class ProjectEntity(@PrimaryKey val id: String, val name: String, val creativeGoal: String?, val updatedAt: String?)

@Entity(tableName = "versions")
data class VersionEntity(@PrimaryKey val id: String, val projectId: String, val sequence: Int, val actorType: String?, val assetId: String?)

@Dao
interface CanopyDao {
    @Query("SELECT * FROM projects ORDER BY updatedAt DESC")
    suspend fun projects(): List<ProjectEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProjects(projects: List<ProjectEntity>)

    @Query("SELECT * FROM versions WHERE projectId=:projectId ORDER BY sequence")
    suspend fun versions(projectId: String): List<VersionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveVersions(versions: List<VersionEntity>)
}

@Database(entities = [ProjectEntity::class, VersionEntity::class], version = 1)
abstract class CanopyDatabase : RoomDatabase() {
    abstract fun dao(): CanopyDao
}
