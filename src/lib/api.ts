class DappDojoAPI {
  private baseURL: string;

  constructor(baseURL = 'http://localhost:3002') {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
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
