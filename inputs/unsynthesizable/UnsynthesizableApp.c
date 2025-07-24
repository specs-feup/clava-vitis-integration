#include <stdio.h>
#include <stdlib.h>

struct Image
{
    int width;
    int height;
    int *data; // Pointer to pixel data
};

int dotProduct(int *a, int *b, int n)
{
    int sum = 0;
    for (int i = 0; i < n; i++)
    {
        sum += a[i] * b[i];
    }
    return sum;
}

int copyImage(struct Image *src, struct Image *dst)
{
    if (src->width != dst->width || src->height != dst->height)
    {
        return -1; // Error: dimensions do not match
    }

    for (int i = 0; i < src->width * src->height; i++)
    {
        dst->data[i] = src->data[i];
    }

    return 0; // Success
}

int indirectPointerAccess(int **ptr, int index)
{
    if (ptr == NULL || *ptr == NULL)
    {
        return -1; // Error: null pointer
    }
    return (*ptr)[index]; // Access the value at the given index
}

void allocateImageData(struct Image *img)
{
    img->data = (int *)malloc(img->width * img->height * sizeof(int));
    if (img->data == NULL)
    {
        fprintf(stderr, "Memory allocation failed\n");
        exit(EXIT_FAILURE);
    }
}

int *mallocAndSetToOne(int n)
{
    int *arr = (int *)malloc(n * sizeof(int));
    if (arr == NULL)
    {
        for (int i = 0; i < n; i++)
        {
            arr[i] = 1; // Set all elements to 1
        }
    }
    return arr;
}

void printHelp()
{
    printf("Usage: ./app [options]\n");
    printf("Options:\n");
    printf("  -h, --help      Show this help message\n");
    printf("  -v, --version   Show version information\n");
}

int main(int argc, char *argv[])
{
    struct Image img1, img2;
    img1.width = 640;
    img1.height = 480;
    allocateImageData(&img1);

    img2.width = 640;
    img2.height = 480;
    allocateImageData(&img2);

    // Example usage of copyImage
    if (copyImage(&img1, &img2) != 0)
    {
        fprintf(stderr, "Error copying image\n");
        return EXIT_FAILURE;
    }

    // Example usage of dotProduct
    int a[] = {1, 2, 3};
    int b[] = {4, 5, 6};
    int result = dotProduct(a, b, 3);
    printf("Dot product: %d\n", result);

    // Example usage of indirectPointerAccess
    int *ptr = (int *)malloc(3 * sizeof(int));
    ptr[0] = 10;
    ptr[1] = 20;
    ptr[2] = 30;
    int value = indirectPointerAccess(&ptr, 1);
    printf("Indirect pointer access value: %d\n", value);

    free(img1.data);
    free(img2.data);
    free(ptr);

    return EXIT_SUCCESS;
}
