import { defineStore } from 'pinia'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }),

  actions: {
    async login(password: string): Promise<boolean> {
      this.isLoading = true
      this.error = null

      try {
        const response = await $fetch('/api/auth/login', {
          method: 'POST',
          body: { password }
        })

        if (response.success) {
          this.isAuthenticated = true
          
          // セッションストレージにも保存（ページリロード対応）
          if (process.client) {
            sessionStorage.setItem('auth_token', 'authenticated')
          }
          
          return true
        } else {
          this.error = response.message || 'ログインに失敗しました'
          return false
        }
      } catch (error) {
        this.error = 'ネットワークエラーが発生しました'
        console.error('Login error:', error)
        return false
      } finally {
        this.isLoading = false
      }
    },

    async logout(): Promise<void> {
      this.isLoading = true

      try {
        await $fetch('/api/auth/logout', {
          method: 'POST'
        })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.isAuthenticated = false
        this.error = null
        this.isLoading = false
        
        // セッションストレージからも削除
        if (process.client) {
          sessionStorage.removeItem('auth_token')
        }
      }
    },

    async checkAuth(): Promise<void> {
      this.isLoading = true

      try {
        const response = await $fetch('/api/auth/check')
        this.isAuthenticated = response.authenticated

        // サーバーサイドで認証されていない場合、セッションストレージもクリア
        if (!response.authenticated && process.client) {
          sessionStorage.removeItem('auth_token')
        }
      } catch (error) {
        this.isAuthenticated = false
        if (process.client) {
          sessionStorage.removeItem('auth_token')
        }
        console.error('Auth check error:', error)
      } finally {
        this.isLoading = false
      }
    },

    // クライアントサイドでセッションストレージから認証状態を復元
    initializeAuthFromSession(): void {
      if (process.client) {
        const token = sessionStorage.getItem('auth_token')
        if (token === 'authenticated') {
          this.isAuthenticated = true
        }
      }
    },

    clearError(): void {
      this.error = null
    }
  }
})