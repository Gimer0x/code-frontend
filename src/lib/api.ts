class DappDojoAPI {
  private baseURL: string;
  private inFlight: Map<string, Promise<any>> = new Map()
  private cache: Map<string, { data: any; expiresAt: number }> = new Map()
  private defaultTtlMs = 10_000 // 10s cache for GETs

  constructor(baseURL = 'http://localhost:3002') {
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
      // Handle 429 backoff once
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'))
        const delayMs = isNaN(retryAfter) ? 1000 : Math.min(retryAfter * 1000, 3000)
        await new Promise(res => setTimeout(res, delayMs))
        const retryResp = await fetch(url, config)
        const retryData = await retryResp.json().catch(() => ({}))
        if (!retryResp.ok) {
          throw new Error(retryData.error || `Request failed with status ${retryResp.status}`)
        }
        if (isGet) this.cache.set(cacheKey, { data: retryData, expiresAt: Date.now() + this.defaultTtlMs })
        return retryData
      }

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

  // Helper method to get image URL (relative for Next.js proxy)
  getImageUrl(thumbnail: string | null): string | null {
    if (!thumbnail) return null;
    // Return relative URL so Next.js can proxy it to backend
    return `/${thumbnail}`;
  }
}

// Create and export a singleton instance
export const api = new DappDojoAPI();
export default api;
