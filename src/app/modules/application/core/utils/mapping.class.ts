export class Mapping {
  public static isTypeOf<T>(jsonObject: Object, instanceType: { new(): T; }): boolean {
    // Check that all the properties of the JSON Object are also available in the Class.
    const instanceObject = new instanceType();
    if(Object.keys(jsonObject).length != Object.keys(instanceObject).length)
      return false;

    for (let propertyName in instanceObject) {
      if (!jsonObject.hasOwnProperty(propertyName)) {
        // If any property in instance object is missing then we have a mismatch.
        return false;
      }
    }
    // All the properties are matching between object and the instance type.
    return true;
  };

  /**
   * Checks if the given json object is type of a given instance (class/interface) type.
   * @param jsonObject Object to check.
   * @param instanceType The type to check for the object.
   * @returns true if object is of the given instance type; false otherwise.
   */
  public static isCollectionTypeOf<T>(jsonObjectCollection: any[], instanceType: { new(): T; }): boolean {
    // Check that all the properties of the JSON Object are also available in the Class.
    const instanceObject = new instanceType();
    for (let jsonObject of jsonObjectCollection) {
      if(Object.keys(jsonObject).length != Object.keys(instanceObject).length)
        return false;
      for (let propertyName in instanceObject) {
        if (!jsonObject.hasOwnProperty(propertyName)) {
          // If any property in instance object is missing then we have a mismatch.
          return false;
        }
      }
    }
    // All the properties are matching between object and the instance type.
    return true;
  };
} // End of class: Mapping
