package com.canopy.android.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.tokenDataStore by preferencesDataStore("canopy_secure_session")

class TokenStore(private val context: Context) {
    private val encryptedAccessToken = stringPreferencesKey("encrypted_access_token")
    private val keyAlias = "canopy_access_token"
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    suspend fun get(): String? {
        val encoded = context.tokenDataStore.data.first()[encryptedAccessToken] ?: return null
        val packed = Base64.decode(encoded, Base64.NO_WRAP)
        val iv = packed.copyOfRange(0, 12)
        val cipherText = packed.copyOfRange(12, packed.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        return cipher.doFinal(cipherText).decodeToString()
    }

    suspend fun set(token: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val cipherText = cipher.doFinal(token.encodeToByteArray())
        val packed = cipher.iv + cipherText
        context.tokenDataStore.edit { it[encryptedAccessToken] = Base64.encodeToString(packed, Base64.NO_WRAP) }
    }

    suspend fun clear() {
        context.tokenDataStore.edit { it.remove(encryptedAccessToken) }
    }

    private fun secretKey(): SecretKey {
        keyStore.getKey(keyAlias, null)?.let { return it as SecretKey }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(keyAlias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }
}
