class DappDojoAPI {
  private baseURL: string;
  private inFlight: Map<string, Promise<any>> = new Map()
  private cache: Map<string, { data: any; expiresAt: number }> = new Map()
  private defaultTtlMs = 30_000 // 30s cache for GETs to reduce requests
  private rateLimitCooldown: Map<string, number> = new Map() // Track rate limit cooldowns per endpoint

  // Get cooldown from localStorage (persists across Fast Refresh)
  private getCooldownFromStorage(url: string): number | null {
    if (typeof window === 'undefined') return null
    try {
      const key = `rateLimitCooldown:${url}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const cooldownEnd = parseInt(stored, 10)
        if (cooldownEnd > Date.now()) {
          return cooldownEnd
        } else {
          // Cooldown expired, remove from storage
          localStorage.removeItem(key)
        }
      }
    } catch (e) {
      // localStorage might not be available
    }
    return null
  }

  // Set cooldown in both memory and localStorage
  private setCooldown(url: string, cooldownEnd: number): void {
    this.rateLimitCooldown.set(url, cooldownEnd)
    if (typeof window !== 'undefined') {
      try {
        const key = `rateLimitCooldown:${url}`
        localStorage.setItem(key, cooldownEnd.toString())
      } catch (e) {
        // localStorage might not be available
      }
    }
  }

  // Clear cooldown from both memory and localStorage
  private clearCooldown(url: string): void {
    this.rateLimitCooldown.delete(url)
    if (typeof window !== 'undefined') {
      try {
        const key = `rateLimitCooldown:${url}`
        localStorage.removeItem(key)
      } catch (e) {
        // localStorage might not be available
      }
    }
  }

  constructor(baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '') {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase()
    const isGet = method === 'GET'

    // Check short-lived cache for GET
    const cacheKey = `${method}:${url}`
    if (isGet) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data
      }
    }

    // Check rate limit cooldown BEFORE making request (check both memory and localStorage)
    let cooldownEnd = this.rateLimitCooldown.get(url)
    if (!cooldownEnd || cooldownEnd <= Date.now()) {
      // Check localStorage in case Fast Refresh cleared memory
      const storedCooldown = this.getCooldownFromStorage(url)
      if (storedCooldown) {
        cooldownEnd = storedCooldown
        this.rateLimitCooldown.set(url, cooldownEnd)
      }
    }
    
    if (cooldownEnd && cooldownEnd > Date.now()) {
      const remainingMs = cooldownEnd - Date.now()
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(remainingMs / 1000)} seconds before trying again.`)
    }

    // In-flight de-duplication
    const inflightKey = `${method}:${url}:${isGet ? '' : (options.body ? String(options.body) : '')}`
    if (this.inFlight.has(inflightKey)) {
      return this.inFlight.get(inflightKey)!
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const exec = async () => {

      const response = await fetch(url, config);
      
      // Handle 429 - don't retry automatically, just throw error and set cooldown
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'))
        // Set cooldown period: use retry-after header if available, otherwise default to 60 seconds
        const cooldownMs = isNaN(retryAfter) || retryAfter === 0 ? 60_000 : Math.min(retryAfter * 1000, 120_000)
        const cooldownEnd = Date.now() + cooldownMs
        this.setCooldown(url, cooldownEnd)
        
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Rate limited (429). Cooldown set for ${Math.ceil(cooldownMs / 1000)} seconds.`)
        }
        
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      }
      
      // Clear cooldown if request succeeded
      this.clearCooldown(url)

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      if (isGet) this.cache.set(cacheKey, { data, expiresAt: Date.now() + this.defaultTtlMs })
      return data;
    }

    const promise = exec()
      .finally(() => {
        // Clear in-flight after settle
        this.inFlight.delete(inflightKey)
      })

    this.inFlight.set(inflightKey, promise)
    return promise
  }

  // Course methods
  async getCourses(page = 1, limit = 10, filters: Record<string, string> = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return this.request(`/api/courses?${params}`);
  }

  async getCourse(courseId: string) {
    return this.request(`/api/courses/${courseId}`);
  }

  async createCourse(courseData: any) {
    return this.request('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(courseId: string, updateData: any) {
    return this.request(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCourse(courseId: string) {
    return this.request(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // Module methods
  async getCourseModules(courseId: string) {
    return this.request(`/api/courses/${courseId}/modules`);
  }

  async createModule(courseId: string, moduleData: any) {
    return this.request(`/api/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  // Lesson methods
  async getModuleLessons(moduleId: string) {
    return this.request(`/api/modules/${moduleId}/lessons`);
  }

  async getLesson(lessonId: string) {
    return this.request(`/api/lessons/${lessonId}`);
  }

  async createLesson(moduleId: string, lessonData: any) {
    return this.request(`/api/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  }

  // Compilation and testing
  async compileCode(userId: string, courseId: string, code: string) {
    return this.request('/api/compile', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId, code }),
    });
  }

  async testCode(userId: string, courseId: string, code: string) {
    return this.request('/api/test', {
      method: 'POST',
      body: JSON.stringify({ userId, courseId, code }),
    });
  }

  // User courses methods
  async getUserCourses(page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    // Use frontend API route which handles authentication
    const response = await fetch(`/api/user/courses?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  // Student progress methods
  async getStudentProgress(courseId: string, lessonId?: string, authToken?: string) {
    const params = new URLSearchParams({ courseId });
    if (lessonId) params.append('lessonId', lessonId);
    
    // Use frontend API route which handles authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if provided (for client-side calls)
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`/api/student/progress?${params}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      // 404 is acceptable (no progress yet)
      if (response.status === 404) {
        return { success: true, files: [], isCompleted: false };
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  // Helper method to get image URL (direct backend URL)
  getImageUrl(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    
    // Get the full backend URL for the image
    // Import getCourseImageUrl dynamically to avoid circular dependencies
    const { getCourseImageUrl } = require('@/lib/imageUtils');
    return getCourseImageUrl(thumbnail);
  }
}

// Create and export a singleton instance
export const api = new DappDojoAPI();
export default api;
