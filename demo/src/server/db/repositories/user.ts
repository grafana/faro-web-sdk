import { hash } from 'bcrypt';
import { DataTypes, Model } from 'sequelize';
import type { InferAttributes, ModelCtor, Sequelize } from 'sequelize';

import type { UserInputModel, UserModel } from '../../../common';

export interface UserShape extends UserModel, Model<InferAttributes<UserShape>, UserInputModel> {}

export let User: ModelCtor<UserShape>;

export async function initializeUser(db: Sequelize): Promise<void> {
  User = db.define<UserShape>(
    'User',
    {
      id: {
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        type: DataTypes.UUID,
        unique: true,
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      password: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    },
    {
      timestamps: false,
      hooks: {
        beforeCreate: async (user: UserInputModel) => {
          if (user.password) {
            user.password = await hash(user.password, 10);
          }
        },
        beforeUpdate: async (user: UserInputModel) => {
          if (user.password) {
            user.password = await hash(user.password, 10);
          }
        },
      },
    }
  );

  await User.sync();
}
