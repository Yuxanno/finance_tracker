import { getDatabase } from '../config/database.js';
import { toObjectId } from '../utils/helpers.js';

export class CategoriesService {
  constructor() {
    this.db = getDatabase();
  }

  async getCategories(userId, type = null) {
    const userObjId = toObjectId(userId.toString());
    const filter = { userId: userObjId };
    if (type) filter.type = type;

    const categories = await this.db.collection('categories')
      .find(filter)
      .sort({ createdAt: 1 })
      .toArray();

    return categories;
  }

  async createCategory(userId, data) {
    const userObjId = toObjectId(userId.toString());
    const category = {
      userId: userObjId,
      name: data.name,
      type: data.type,
      color: data.color || '#6366f1',
      icon: data.icon || '📁',
      isDefault: false,
      createdAt: new Date()
    };

    const result = await this.db.collection('categories').insertOne(category);
    return { ...category, _id: result.insertedId };
  }

  async updateCategory(userId, categoryId, data) {
    const userObjId = toObjectId(userId.toString());
    const update = {};
    if (data.name) update.name = data.name;
    if (data.color) update.color = data.color;
    if (data.icon) update.icon = data.icon;

    const result = await this.db.collection('categories').findOneAndUpdate(
      { _id: toObjectId(categoryId), userId: userObjId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }

    return result;
  }

  async deleteCategory(userId, categoryId) {
    const objId = toObjectId(categoryId);
    const userObjId = toObjectId(userId.toString());

    // Check if category exists and belongs to this user
    const category = await this.db.collection('categories').findOne({
      _id: objId,
      userId: userObjId
    });

    if (!category) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }

    // Save category snapshot into all related transactions BEFORE deleting
    // so that the category info is preserved even after deletion
    await this.db.collection('transactions').updateMany(
      { categoryId: objId, userId: userObjId },
      {
        $set: {
          categorySnapshot: {
            name: category.name,
            icon: category.icon,
            color: category.color
          }
        }
      }
    );

    await this.db.collection('categories').deleteOne({
      _id: objId,
      userId: userObjId
    });

    return true;
  }
}
